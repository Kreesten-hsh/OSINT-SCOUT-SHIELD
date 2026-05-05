import java.io.File

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val defaultBuildRoot =
    File(System.getProperty("java.io.tmpdir"), "bcs_mobile_gradle_build")

val externalBuildRoot =
    File(
        System.getenv("BCS_ANDROID_BUILD_DIR")
            ?.takeIf { it.isNotBlank() }
            ?: defaultBuildRoot.path,
    ).absoluteFile
val flutterProjectBuildRoot = File(rootProject.projectDir.parentFile, "build")
val canonicalFlutterApkDir = File(flutterProjectBuildRoot, "app/outputs/flutter-apk")

rootProject.layout.buildDirectory.set(externalBuildRoot)

subprojects {
    project.layout.buildDirectory.set(File(externalBuildRoot, project.name))
}
subprojects {
    project.evaluationDependsOn(":app")
}

gradle.projectsEvaluated {
    project(":app").tasks.matching { it.name.startsWith("assemble") }.configureEach {
        doLast {
            copy {
                from(project(":app").layout.buildDirectory.dir("outputs/flutter-apk"))
                into(canonicalFlutterApkDir)
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(externalBuildRoot)
}
